import async from "async";
import _ from "lodash";
import { deploy, sendContractTx, asyncfunc } from "runethtx";
import { MultiSigWalletAbi, MultiSigWalletByteCode } from "../contracts/MultiSigWallet.sol.js";

export default class MultiSigWallet {

    constructor(web3, address) {
        this.web3 = web3;
        this.contract = this.web3.eth.contract(MultiSigWalletAbi).at(address);
    }

    getState(_cb) {
        return asyncfunc((cb) => {
            const st = {};
            let nTransactions;
            async.series([
                (cb1) => {
                    this.contract.required((err, _required) => {
                        if (err) { cb(err); return; }
                        st.required = _required.toNumber();
                        cb1();
                    });
                },
                (cb1) => {
                    this.contract.getOwners((err, _owners) => {
                        if (err) { cb(err); return; }
                        st.owners = _owners;
                        cb1();
                    });
                },
                (cb1) => {
                    this.web3.eth.getBalance(this.contract.address, (err, _balance) => {
                        if (err) { cb(err); return; }
                        st.balance = _balance;
                        cb1();
                    });
                },
                (cb1) => {
                    this.contract.getTransactionCount(true, true, (err, res) => {
                        if (err) { cb(err); return; }
                        nTransactions = res.toNumber();
                        st.transactions = [];
                        cb1();
                    });
                },
                (cb1) => {
                    async.eachSeries(_.range(0, nTransactions), (idTransaction, cb2) => {
                        let transaction;
                        async.series([
                            (cb3) => {
                                this.contract.transactions(idTransaction, (err, res) => {
                                    if (err) { cb(err); return; }
                                    transaction = {
                                        destination: res[ 0 ],
                                        value: res[ 1 ],
                                        data: res[ 2 ],
                                        executed: res[ 3 ],
                                    };
                                    st.transactions.push(transaction);
                                    cb3();
                                });
                            },
                            (cb3) => {
                                this.contract.getConfirmations(idTransaction, (err, res) => {
                                    if (err) { cb(err); return; }
                                    transaction.confirmations = res;
                                    cb3();
                                });
                            },
                        ], cb2);
                    }, cb1);
                },
            ], (err) => {
                if (err) { cb(err); return; }
                cb(null, st);
            });
        }, _cb);
    }

    static deploy(web3, opts, _cb) {
        return asyncfunc((cb) => {
            const params = Object.assign({}, opts);
            params.abi = MultiSigWalletAbi;
            params.byteCode = MultiSigWalletByteCode;
            return deploy(web3, params, (err, _multiSigWallet) => {
                if (err) {
                    cb(err);
                    return;
                }
                const multiSigWallet = new MultiSigWallet(web3, _multiSigWallet.address);
                cb(null, multiSigWallet);
            });
        }, _cb);
    }

    submitTransaction(opts, cb) {
        return sendContractTx(
            this.web3,
            this.contract,
            "submitTransaction",
            opts,
            cb);
    }
}
